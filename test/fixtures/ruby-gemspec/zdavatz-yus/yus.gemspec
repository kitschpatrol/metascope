# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'yus/version'

Gem::Specification.new do |spec|
  spec.name          = "yus"
  spec.version       = Yus::VERSION
  spec.summary     = "ywesee user server"
  spec.description = ". Works with the ywesee webframework and all the ywesee software packages."
  spec.author      = 'Yasuhiro Asaka, Zeno R.R. Davatz, Niklaus Giger'
  spec.email       = 'yasaka@ywesee.com,  zdavatz@ywesee.com, ngiger@ywesee.com'
  spec.platform    = Gem::Platform::RUBY
  spec.license     = "GPLv3"
  spec.homepage  = "https://github.com/zdavatz/yus/"
  spec.metadata["changelog_uri"] = spec.homepage + "/blob/master/History.txt"
  spec.required_ruby_version = '>= 3.0'

  spec.metadata['allowed_push_host'] = 'https://rubygems.org' if RUBY_VERSION.to_f > 2.0

  spec.files         = `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_dependency "needle"
  spec.add_dependency "ydbi"
  spec.add_dependency "ydbd-pg"
  spec.add_dependency 'rclconf'
  spec.add_dependency 'logger'
  spec.add_dependency 'odba', '>= 1.1.6'

  spec.add_runtime_dependency 'highline'
  spec.add_dependency 'deprecated', '2.0.1'
  spec.add_development_dependency "drb"
  spec.add_development_dependency "test-unit"
  spec.add_development_dependency "minitest"
  spec.add_development_dependency "bundler"
  spec.add_development_dependency "flexmock", '~>1.3.0'
  spec.add_development_dependency "rake"
  spec.add_development_dependency "simplecov"
end
