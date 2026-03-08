# coding: utf-8
lib = File.expand_path('lib', __dir__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'manageiq/providers/nutanix/version'

Gem::Specification.new do |spec|
  spec.name          = "manageiq-providers-nutanix"
  spec.version       = ManageIQ::Providers::Nutanix::VERSION
  spec.authors       = ["ManageIQ Authors"]

  spec.summary       = "ManageIQ plugin for the Nutanix provider."
  spec.description   = "ManageIQ plugin for the Nutanix provider."
  spec.homepage      = "https://github.com/ManageIQ/manageiq-providers-nutanix"
  spec.license       = "Apache-2.0"

  spec.files         = `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_development_dependency "manageiq-style"
  spec.add_development_dependency "simplecov",  ">= 0.21.2"

  spec.add_dependency "nutanix_clustermgmt", "~> 0.1.0"
  spec.add_dependency "nutanix_vmm",         "~> 0.1.0"
  spec.add_dependency "nutanix_volumes",     "~> 0.1.0"
end
